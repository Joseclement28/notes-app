pipeline {
    agent any
    environment {
        PROJECT_ID = "amiable-archive-473111-d4"
        REGION = "us-central1"
        ZONE = "us-central1-a"
        REPO = "my-repo"
        ARTIFACT_HOST = "${REGION}-docker.pkg.dev"
        FRONTEND_IMG = "${ARTIFACT_HOST}/${PROJECT_ID}/${REPO}/notes-frontend"
        BACKEND_IMG  = "${ARTIFACT_HOST}/${PROJECT_ID}/${REPO}/notes-backend"
        K8S_NAMESPACE = "default"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Authenticate gcloud') {
            steps {
                bat '''
                echo Using attached VM service account...
                gcloud config set project %PROJECT_ID%
                gcloud auth list
                gcloud auth configure-docker %REGION%-docker.pkg.dev --quiet
                '''
            }
        }

        stage('Build & Push Frontend') {
            steps {
                dir('frontend') {
                    bat '''
                    set IMAGE_TAG=%FRONTEND_IMG%:%BUILD_NUMBER%
                    docker build -t %IMAGE_TAG% .
                    docker push %IMAGE_TAG%
                    echo %IMAGE_TAG% > %TEMP%\\frontend_image
                    '''
                }
            }
        }

        stage('Build & Push Backend') {
            steps {
                dir('backend') {
                    bat '''
                    set IMAGE_TAG=%BACKEND_IMG%:%BUILD_NUMBER%
                    docker build -t %IMAGE_TAG% .
                    docker push %IMAGE_TAG%
                    echo %IMAGE_TAG% > %TEMP%\\backend_image
                    '''
                }
            }
        }

        stage('Deploy to GKE') {
            steps {
                bat '''
                gcloud container clusters get-credentials notes-cluster --zone=%ZONE% --project=%PROJECT_ID%
                set /p FRONT_IMG=<%TEMP%\\frontend_image
                set /p BACK_IMG=<%TEMP%\\backend_image

                kubectl set image deployment/frontend frontend=%FRONT_IMG% --namespace=%K8S_NAMESPACE% || exit 0
                kubectl set image deployment/backend backend=%BACK_IMG% --namespace=%K8S_NAMESPACE% || exit 0

                kubectl apply -f k8s/configmap.yaml
                kubectl apply -f k8s/secret.yaml
                kubectl apply -f k8s/backend-deployment.yaml
                kubectl apply -f k8s/service-backend.yaml
                kubectl apply -f k8s/frontend-deployment.yaml
                kubectl apply -f k8s/service-frontend.yaml
                kubectl apply -f k8s/ingress.yaml || exit 0

                kubectl rollout status deployment/frontend --namespace=%K8S_NAMESPACE% --timeout=120s
                kubectl rollout status deployment/backend --namespace=%K8S_NAMESPACE% --timeout=120s
                '''
            }
        }
    }

    post {
        success { echo "✅ Deployment successful" }
        failure { echo "❌ Build or deploy failed" }
    }
}
