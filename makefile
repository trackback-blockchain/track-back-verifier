export REGION						:= ap-southeast-2
export ECR_REPO_URL					:= 533545012068.dkr.ecr.ap-southeast-2.amazonaws.com
export BRANCH_NAME					:=$(shell git branch --show-current)

run: ecr-login
	docker-compose up --build --force-recreate --remove-orphans -d

redeploy: ecr-login clean run

stop:
	docker-compose stop -t 1

ecr-login:
	aws ecr get-login-password \
    --region ${REGION} \
	| docker login \
		--username AWS \
		--password-stdin ${ECR_REPO_URL}

ecr: ecr-login
	-aws ecr create-repository --repository-name demo-verifier || true
	-aws ecr create-repository --repository-name demo-verifier-agent || true
	-aws ecr create-repository --repository-name demo-verifier-nginx || true

build-api:
	cd demo-verifier-agent && docker build -f ./Dockerfile --no-cache -t demo-verifier-agent:latest  .
	docker tag demo-verifier-agent:latest $(ECR_REPO_URL)/demo-verifier-agent:latest
	docker push $(ECR_REPO_URL)/demo-verifier-agent:latest

build-verifier:
	cd demo-verifier && docker build -f ./Dockerfile --no-cache -t demo-verifier:latest  .
	docker tag demo-verifier:latest $(ECR_REPO_URL)/demo-verifier:latest
	docker push $(ECR_REPO_URL)/demo-verifier:latest

build-nginx:
	cd nginx  && docker build -f ./Dockerfile --no-cache -t demo-verifier-nginx:latest  .	
	docker tag demo-verifier-nginx:latest $(ECR_REPO_URL)/demo-verifier-nginx:latest
	docker push $(ECR_REPO_URL)/demo-verifier-nginx:latest

build: build-api build-verifier build-nginx

clean:
	docker-compose stop -t 1
	docker-compose rm -f
	docker rmi -f $(shell docker images -q)

destroy:
	cd terraform/ap-southeast-2 && terraform destroy -var="branch_name=$(BRANCH_NAME)" --auto-approve 

deploy: destroy
	cd terraform/ap-southeast-2 && terraform apply -var="branch_name=$(BRANCH_NAME)" --auto-approve 