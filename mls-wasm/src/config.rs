use std::{collections::HashMap, ops::Deref};

use mls_rs::{
    MlsRules,
    crypto::SignaturePublicKey,
    error::{IntoAnyError, MlsError},
    extension::{ExtensionType, MlsCodecExtension},
    group::{
        GroupContext, Member, Roster, Sender,
        proposal::{MlsCustomProposal, ProposalType},
    },
    identity::{Credential, CredentialType, MlsCredential},
    mls_rs_codec::{MlsDecode, MlsEncode, MlsSize},
    mls_rules::{CommitDirection, CommitOptions, CommitSource, EncryptionOptions, ProposalBundle},
};

const FIREFLY_CREDENTIAL_TYPE: CredentialType = CredentialType::new(32001);
const FIREFLY_ROSTER_EXTENSION_TYPE: ExtensionType = ExtensionType::new(32000);
const ADD_USER_PROPOSAL_TYPE: ProposalType = ProposalType::new(30001);
const REMOVE_USER_PROPOSAL_TYPE: ProposalType = ProposalType::new(30002);
const ADD_CHANNEL_PROPOSAL_TYPE: ProposalType = ProposalType::new(30003);
const REMOVE_CHANNEL_PROPOSAL_TYPE: ProposalType = ProposalType::new(30004);

#[derive(MlsSize, MlsDecode, MlsEncode, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct UserPermissions(u8);

impl UserPermissions {
    pub fn has(&self, permission: UserPermission) -> bool {
        self.0 & permission as u8 == permission as u8
    }
}

#[derive(Copy, Clone)]
#[repr(u8)]
pub enum UserPermission {
    AddUser = 1u8,
    RemoveUser = 2u8,
    AddMessage = 4u8,
    ManageChannel = 8u8,
    ManageRole = 16u8,
}

#[derive(MlsSize, MlsDecode, MlsEncode, PartialEq, Eq, PartialOrd, Ord)]
pub struct GroupRole {
    id: u8,
    name: String,
    permissions: UserPermissions,
}

#[derive(MlsSize, MlsDecode, MlsEncode)]
#[repr(u8)]
pub enum ChannelType {
    Media = 1u8,
    Text = 2u8,
}

#[derive(MlsSize, MlsDecode, MlsEncode)]
pub struct GroupChannel {
    id: u8,
    name: String,
    ty: ChannelType,
}

#[derive(MlsSize, MlsDecode, MlsEncode)]
pub struct ArrayMap<V: MlsSize + MlsDecode + MlsEncode> {
    arr: Vec<V>,
}

impl<V: MlsSize + MlsDecode + MlsEncode> Deref for ArrayMap<V> {
    type Target = Vec<V>;

    fn deref(&self) -> &Self::Target {
        &self.arr
    }
}

impl<V: Default + Clone + MlsSize + MlsDecode + MlsEncode> ArrayMap<V> {
    pub fn filled(n: usize) -> Self {
        Self {
            arr: vec![V::default(); n],
        }
    }
}

#[derive(MlsSize, MlsDecode, MlsEncode)]
pub struct UserRole(u8);

#[derive(MlsSize, MlsDecode, MlsEncode)]
pub struct FireflyGroupContext {
    roles: Vec<GroupRole>,
    channels: Vec<GroupChannel>,
    // members: HashMap<String, ArrayMap<UserRole>>, // members -> channel -> role
}

#[derive(MlsSize, MlsDecode, MlsEncode)]
pub struct FireflyMemberCredential {
    signature: Vec<u8>,
    username: String,
    user_public_key: SignaturePublicKey,
    channels_and_roles: ArrayMap<UserRole>,
}

impl TryFrom<Member> for FireflyMemberCredential {
    type Error = FireflyError;

    fn try_from(value: Member) -> Result<Self, Self::Error> {
        let Credential::Custom(credential) = value.signing_identity.credential else {
            return Err(FireflyError::new("Not Firefly Credential Type"));
        };

        let credential = FireflyMemberCredential::mls_decode(&mut &*credential.data)
            .map_err(|err| FireflyError::new(err.to_string()))?;

        return Ok(credential);
    }
}

impl MlsCredential for FireflyMemberCredential {
    type Error = anyhow::Error;

    fn credential_type() -> mls_rs::identity::CredentialType {
        return FIREFLY_CREDENTIAL_TYPE;
    }

    fn into_credential(self) -> Result<mls_rs::identity::Credential, Self::Error> {
        Ok(mls_rs::identity::Credential::Custom(
            mls_rs::identity::CustomCredential::new(
                Self::credential_type(),
                self.mls_encode_to_vec()?,
            ),
        ))
    }
}

#[derive(MlsSize, MlsDecode, MlsEncode)]
pub struct FireflyGroupExtension {
    context: FireflyGroupContext,
}

impl MlsCodecExtension for FireflyGroupExtension {
    fn extension_type() -> ExtensionType {
        return FIREFLY_ROSTER_EXTENSION_TYPE;
    }
}

pub struct FireflyMlsRules {
    pending_invites: Vec<String>,
}

#[derive(Debug, thiserror::Error)]
pub struct FireflyError {
    inner: String,
}

impl FireflyError {
    pub fn new(s: impl Into<String>) -> Self {
        Self { inner: s.into() }
    }
}

impl std::fmt::Display for FireflyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.inner)
    }
}

impl From<&str> for FireflyError {
    fn from(value: &str) -> Self {
        Self::new(value)
    }
}

impl IntoAnyError for FireflyError {
    fn into_dyn_error(self) -> Result<Box<dyn std::error::Error + Send + Sync>, Self> {
        Err(self)
    }
}

impl From<MlsError> for FireflyError {
    fn from(value: MlsError) -> Self {
        Self::new(value.to_string())
    }
}

#[derive(MlsSize, MlsDecode, MlsEncode)]
pub struct AddUserProposal {
    channel_id: u8,
    username: String,
}

impl MlsCustomProposal for AddUserProposal {
    fn proposal_type() -> ProposalType {
        return ADD_USER_PROPOSAL_TYPE;
    }
}

#[derive(MlsSize, MlsDecode, MlsEncode)]
pub struct RemoveUserProposal {
    channel_id: u8,
    username: String,
}

#[derive(MlsSize, MlsDecode, MlsEncode)]
pub struct AddMessageProposal {
    channel_id: u8,
    content: String,
}

impl MlsRules for FireflyMlsRules {
    type Error = FireflyError;

    #[doc = " This is called when preparing or receiving a commit to pre-process the set of committed"]
    #[doc = " proposals."]
    #[doc = ""]
    #[doc = " Both proposals received during the current epoch and at the time of commit"]
    #[doc = " will be presented for validation and filtering. Filter and validate will"]
    #[doc = " present a raw list of proposals. Standard MLS rules are applied internally"]
    #[doc = " on the result of these rules."]
    #[doc = ""]
    #[doc = " Each member of a group MUST apply the same proposal rules in order to"]
    #[doc = " maintain a working group."]
    #[doc = ""]
    #[doc = " Typically, any invalid proposal should result in an error. The exception are invalid"]
    #[doc = " by-reference proposals processed when _preparing_ a commit, which should be filtered"]
    #[doc = " out instead. This is to avoid the deadlock situation when no commit can be generated"]
    #[doc = " after receiving an invalid set of proposal messages."]
    #[doc = ""]
    #[doc = " `ProposalBundle` can be arbitrarily modified. For example, a Remove proposal that"]
    #[doc = " removes a moderator can result in adding a GroupContextExtensions proposal that updates"]
    #[doc = " the moderator list in the group context. The resulting `ProposalBundle` is validated"]
    #[doc = " by the library."]
    fn filter_proposals(
        &self,
        direction: CommitDirection,
        source: CommitSource,
        current_roster: &Roster,
        current_context: &GroupContext,
        proposals: ProposalBundle,
    ) -> Result<ProposalBundle, Self::Error> {
        let CommitSource::ExistingMember(_) = source else {
            return Err(FireflyError::new(
                "New Member is not allowed to make this proposal",
            ));
        };

        let current_extension = match current_context
            .extensions()
            .get_as::<FireflyGroupExtension>()
        {
            Ok(Some(ext)) => ext,
            Ok(None) => return Err(FireflyError::new("No Firefly Roster Extension Found")),
            Err(err) => return Err(FireflyError::new(err.to_string())),
        };

        let mut filtered_proposal = ProposalBundle::default();

        for proposal in proposals.iter_proposals() {
            use mls_rs::group::proposal::BorrowedProposal;

            let Sender::Member(sender_idx) = proposal.sender else {
                return Err("Sender has to be member".into());
            };

            let sender_credential =
                FireflyMemberCredential::try_from(current_roster.member_with_index(sender_idx)?)?;

            let sender_role = sender_credential
                .channels_and_roles
                .get(0)
                .ok_or(FireflyError::from("No default channel exists"))?; // default all channel

            let sender_permissions = current_extension
                .context
                .roles
                .get(sender_role.0 as usize)
                .ok_or(FireflyError::from("No Role with that index exists"))?
                .permissions;

            match &proposal.proposal {
                BorrowedProposal::Add(_) => {
                    if !sender_permissions.has(UserPermission::AddUser) {
                        println!(
                            "WARN: skipping proposal, adder {} don't have permission to add user",
                            sender_credential.username
                        );
                        continue;
                    }
                }
                BorrowedProposal::Remove(_) => {
                    if !sender_permissions.has(UserPermission::RemoveUser) {
                        println!(
                            "WARN: skipping proposal, remover {} don't have permission to remove user",
                            sender_credential.username
                        );
                        continue;
                    }
                }
                BorrowedProposal::Update(proposal) => {
                    if sender_credential.user_public_key
                        != proposal.signing_identity().signature_key
                    {
                        println!(
                            "WARN: skipping update proposal from {} as signatures don't match",
                            sender_credential.username
                        );
                        continue;
                    }
                }
                BorrowedProposal::Psk(_) => {
                    println!("WARN: skipping PSK, as I don't know what it suppose to do");
                    continue;
                }
                BorrowedProposal::ReInit(_) => {
                    println!(
                        "WARN: Skipping REINIT Proposal from {}",
                        sender_credential.username
                    );
                    continue;
                }
                BorrowedProposal::ExternalInit(_) => {
                    println!("WARN: skipping External Init, as I don't know what it suppose to do");
                    continue;
                }
                BorrowedProposal::GroupContextExtensions(_extensions) => {
                    if !(sender_permissions.has(UserPermission::ManageChannel)) {
                        println!(
                            "WARN: skipping proposal, {} don't have permission to update group extensions",
                            sender_credential.username
                        );
                        continue;
                    }

                    // let extension = extensions
                    //     .get_as::<FireflyGroupExtension>()
                    //     .map_err(|err| FireflyError::new(err.to_string()))?
                    //     .ok_or(FireflyError::from("Couldn't find Firefly Extension"))?;
                }
                BorrowedProposal::Custom(_) => {
                    println!("WARN: skipping custom proposals right now");
                }
            }

            filtered_proposal.add(
                proposal.proposal.into(),
                proposal.sender,
                proposal.source.clone(),
            );
        }

        return Ok(filtered_proposal);
    }

    #[doc = " This is called when preparing a commit to determine various options: whether to enforce an update"]
    #[doc = " path in case it is not mandated by MLS, whether to include the ratchet tree in the welcome"]
    #[doc = " message (if the commit adds members) and whether to generate a single welcome message, or one"]
    #[doc = " welcome message for each added member."]
    #[doc = ""]
    #[doc = " The `new_roster` and `new_extension_list` describe the group state after the commit."]
    fn commit_options(
        &self,
        _new_roster: &Roster,
        _new_context: &GroupContext,
        _proposals: &ProposalBundle,
    ) -> Result<CommitOptions, Self::Error> {
        Ok(CommitOptions::new())
    }

    #[doc = " This is called when sending any packet. For proposals and commits, this determines whether to"]
    #[doc = " encrypt them. For any encrypted packet, this determines the padding mode used."]
    #[doc = ""]
    #[doc = " Note that for commits, the `current_roster` and `current_extension_list` describe the group state"]
    #[doc = " before the commit, unlike in [commit_options](MlsRules::commit_options)."]
    fn encryption_options(
        &self,
        _current_roster: &Roster,
        _current_context: &GroupContext,
    ) -> Result<EncryptionOptions, Self::Error> {
        Ok(EncryptionOptions::new(
            false,
            mls_rs::client_builder::PaddingMode::None,
        ))
    }
}
