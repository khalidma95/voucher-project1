pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/khalidma95/voucher-project1.git'
            }
        }

        stage('Clean Old Containers') {
            steps {
                sh '''
                docker rm -f voucher_db || true
                docker rm -f voucher_backend || true
                docker rm -f voucher_frontend || true
                '''
            }
        }

        stage('Build & Deploy') {
            steps {
                sh '''
                cd $WORKSPACE

                docker-compose down
                docker-compose up -d --build
                '''
            }
        }
    }
}