.PHONY: run-docker
run-docker:
	docker-compose up -d

.PHONY: stop-docker
stop-docker:
	docker-compose down

.PHONY: rebuild-docker
rebuild-docker:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

.PHONY: clean-dist
clean-dist:
	docker-compose exec bynder-js-sdk rm -rf /app/dist
	docker-compose exec bynder-js-sdk gulp babel

# make executeSdkSample sample-file-name=oauth_client_credentials.js
.PHONY: executeSdkSample
executeSdkSample:
	docker-compose run --rm bynder-js-sdk node /app/samples/$(sample-file-name)