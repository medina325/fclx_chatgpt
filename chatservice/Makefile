createmigration:
	./migrate create -ext=sql -dir=sql/migrations -seq init

migrate:
	./migrate -path=sql/migrations -database "mysql://root:root@tcp(mysql:3306)/chat" -verbose up

migratedown:
	./migrate -path=sql/migrations -database "mysql://root:root@tcp(mysql:3306)/chat" -verbose drop

grpc:
	protoc --go_out=. --go-grpc_out=. proto/chat.proto

.PHONY: migrate createmigration migratedown grpc