DIR=protobufs
OUTDIR=src/protos

protoc -I=$DIR message.proto  --plugin=node_modules/ts-proto/protoc-gen-ts_proto  --ts_proto_opt=forceLong=bigint  --ts_proto_opt=env=browser --ts_proto_out=$OUTDIR

echo "Done"
