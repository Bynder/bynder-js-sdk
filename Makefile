.PHONY: run-docker
run-docker:
	docker-compose up -d

.PHONY: stop-docker
stop-docker:
	docker-compose down

# make executeSdkSample sample-file-name=oauth_client_credentials.js
.PHONY: executeSdkSample
executeSdkSample:
	docker-compose exec bynder-js-sdk node /app/samples/$(sample-file-name)