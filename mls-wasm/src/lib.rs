// #![cfg(all(mls_build_async, target_arch = "wasm32"))]

mod config;

use mls_rs::{
    CipherSuite, CipherSuiteProvider, Client, CryptoProvider, Extension, ExtensionList,
    client_builder::MlsConfig,
    error::MlsError,
    extension::ExtensionType,
    identity::{
        SigningIdentity,
        basic::{BasicCredential, BasicIdentityProvider},
    },
};

#[cfg(target_arch = "wasm32")]
use web_sys::console;

#[cfg(target_arch = "wasm32")]
use console_error_panic_hook;

#[cfg(target_arch = "wasm32")]
macro_rules! println {
    ($($t:tt)*) => (console::log_1(&format!($($t)*).into()))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn start() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn add(left: u64, right: u64) -> u64 {
    println!("{left} + {right} = {}", left + right);
    left + right
}

const CIPHERSUITE: CipherSuite = CipherSuite::P256_AES128;

const EXTENSION_TYPE_ROLE: ExtensionType = ExtensionType::new(9);
async fn make_client<P: CryptoProvider + Clone>(
    crypto_provider: P,
    name: &str,
) -> Result<Client<impl MlsConfig>, MlsError> {
    let cipher_suite = crypto_provider.cipher_suite_provider(CIPHERSUITE).unwrap();

    println!("Loaded Cipher Suite");

    let (secret, public) = cipher_suite.signature_key_generate().await.unwrap();

    println!("Generated Signature Key");
    let basic_identity = BasicCredential::new(name.as_bytes().to_vec());
    let signing_identity = SigningIdentity::new(basic_identity.into_credential(), public);

    Ok(Client::builder()
        .identity_provider(BasicIdentityProvider)
        .crypto_provider(crypto_provider)
        .signing_identity(signing_identity, secret, CIPHERSUITE)
        .build())
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn run_test_binding() {
    run_test().await.unwrap();
}

pub async fn run_test() -> Result<(), MlsError> {
    // #[cfg(target_arch = "wasm32")]
    let crypto_provider = mls_rs_crypto_webcrypto::WebCryptoProvider::default();

    // #[cfg(not(target_arch = "wasm32"))]
    // let crypto_provider = mls_rs_crypto_openssl::OpensslCryptoProvider::default();

    let alice = make_client(crypto_provider.clone(), "alice").await?;
    let bob = make_client(crypto_provider.clone(), "bob").await?;

    println!("Clients created");

    let mut group_context_extensions_list = ExtensionList::default();
    let mut leaf_node_extension_list = ExtensionList::default();

    let mut alice_group = alice
        .create_group(Default::default(), Default::default(), None)
        .await?;

    println!("Alice created group");
    let bob_key_package = bob
        .generate_key_package_message(
            group_context_extensions_list,
            leaf_node_extension_list,
            None,
        )
        .await?;

    let alice_commit = alice_group
        .commit_builder()
        .add_member(bob_key_package)?
        .build()
        .await?;

    alice_group.apply_pending_commit().await?;
    println!("Alice added bob");

    let (mut bob_group, new_member_info) = bob
        .join_group(None, &alice_commit.welcome_messages[0], None)
        .await?;

    println!("Bob joined the group");

    for extension in new_member_info.group_info_extensions.iter() {
        println!("{:?}", extension);
    }

    let msg = alice_group
        .encrypt_application_message(b"Hello World", Default::default())
        .await?;

    let msg = bob_group.process_incoming_message(msg).await?;
    match msg {
        mls_rs::group::ReceivedMessage::ApplicationMessage(application_message_description) => {
            let msg = String::from_utf8(application_message_description.data().to_vec()).unwrap();
            let sender_index = application_message_description.sender_index;

            let member = bob_group.member_at_index(sender_index).unwrap();

            println!("received from {:?} {}", member, msg);
        }
        mls_rs::group::ReceivedMessage::Commit(commit_message_description) => todo!(),
        mls_rs::group::ReceivedMessage::Proposal(proposal_message_description) => todo!(),
        mls_rs::group::ReceivedMessage::GroupInfo(group_info) => todo!(),
        mls_rs::group::ReceivedMessage::Welcome => todo!(),
        mls_rs::group::ReceivedMessage::KeyPackage(key_package) => todo!(),
    }

    alice_group.write_to_storage().await?;
    bob_group.write_to_storage().await?;

    Ok(())
}
