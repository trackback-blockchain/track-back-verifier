export REGION						:= ap-southeast-2
export ECR_REPO_URL					:= 533545012068.dkr.ecr.ap-southeast-2.amazonaws.com
export BRANCH_NAME					:=$(shell git branch --show-current)
export IP_WEB_DIA					:=$(shell cd terraform/ap-southeast-2 && terraform output -json | jq .info.value.verifier_dia_ip )
export IP_WEB_TA					:=$(shell cd terraform/ap-southeast-2 && terraform output -json | jq .info.value.verifier_ta_ip )
export IP_WEB_TAV					:=$(shell cd terraform/ap-southeast-2 && terraform output -json | jq .info.value.verifier_tav_ip )


run-trackback-dia: ecr-login
	docker-compose --env-file verifier-dia.env up --build --force-recreate --remove-orphans -d

run-trackback-ta: ecr-login
	docker-compose --env-file verifier-ta.env up --build --force-recreate --remove-orphans -d
	
run-trackback-verifier: ecr-login
	docker-compose --env-file verifier-tav.env up --build --force-recreate --remove-orphans -d

redeploy-ta: ecr-login clean run-trackback-ta

redeploy-dia: ecr-login clean run-trackback-dia

redeploy-tav: ecr-login clean run-trackback-verifier

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

remotedeploy: ecr-login build
	ssh -i ~/.ssh/ec2_key.pem ubuntu@$(IP_WEB_DIA) -t 'cd track-back-verifier && make redeploy-dia'
	ssh -i ~/.ssh/ec2_key.pem ubuntu@$(IP_WEB_TA) -t 'cd track-back-verifier && make redeploy-ta'
	ssh -i ~/.ssh/ec2_key.pem ubuntu@$(IP_WEB_TAV) -t 'cd track-back-verifier && make redeploy-tav'