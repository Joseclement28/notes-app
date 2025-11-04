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
        TEMP_DIR = "/tmp"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Authenticate gcloud') {
            steps {
                sh '''
                echo "Using attached VM service account..."
                gcloud config set project $PROJECT_ID
                gcloud auth list
                gcloud auth configure-docker $REGION-docker.pkg.dev --quiet
                '''
            }
        }

        stage('Build & Push Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                    IMAGE_TAG=$FRONTEND_IMG:$BUILD_NUMBER
                    docker build -t $IMAGE_TAG .
                    docker push $IMAGE_TAG
                    echo $IMAGE_TAG > $TEMP_DIR/frontend_image
                    '''
                }
            }
        }

        stage('Build & Push Backend') {
            steps {
                dir('backend') {
                    sh '''
                    IMAGE_TAG=$BACKEND_IMG:$BUILD_NUMBER
                    docker build -t $IMAGE_TAG .
                    docker push $IMAGE_TAG
                    echo $IMAGE_TAG > $TEMP_DIR/backend_image
                    '''
                }
            }
        }

        stage('Deploy to GKE') {
            steps {
                sh '''
                gcloud container clusters get-credentials notes-cluster --zone=$ZONE --project=$PROJECT_ID

                FRONT_IMG=$(cat $TEMP_DIR/frontend_image)
                BACK_IMG=$(cat $TEMP_DIR/backend_image)

                kubectl set image deployment/frontend frontend=$FRONT_IMG --namespace=$K8S_NAMESPACE || true
                kubectl set image deployment/backend backend=$BACK_IMG --namespace=$K8S_NAMESPACE || true

                kubectl apply -f k8s/configmap.yaml
                kubectl apply -f k8s/secret.yaml
                kubectl apply -f k8s/backend-deployment.yaml
                kubectl apply -f k8s/service-backend.yaml
                kubectl apply -f k8s/frontend-deployment.yaml
                kubectl apply -f k8s/service-frontend.yaml
                kubectl apply -f k8s/ingress.yaml || true

                kubectl rollout status deployment/frontend --namespace=$K8S_NAMESPACE --timeout=120s
                kubectl rollout status deployment/backend --namespace=$K8S_NAMESPACE --timeout=120s
                '''
            }
        }
    }

    post {
        success { echo "✅ Deployment successful" }
        failure { echo "❌ Build or deploy failed" }
    }
}
