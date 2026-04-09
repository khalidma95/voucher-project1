pipeline {
    agent any

    stages {

        stage('Clone') {
            steps {
                git 'https://github.com/khalidma95/voucher-project1.git'
            }
        }

        stage('Build Docker') {
            steps {
                sh 'docker-compose down'
                sh 'docker-compose up -d --build'
            }
        }

        stage('Check') {
            steps {
                sh 'docker ps'
            }
        }
    }
}