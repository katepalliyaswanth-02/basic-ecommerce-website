# Basic Ecommerce Platform
A simple Node.js-based ecommerce application with built-in database support, REST API, frontend UI, Docker deployment, and Kubernetes manifests.

# PROJECT STRUCTURE

ECOMMERCE-PLATFORM/
│
├── data/
│   └── ecom.db               # SQLite database
│
├── node_modules/             # Dependencies (auto-installed)
│
├── public/
│   ├── index.html            # Frontend UI
│   └── k8s/
│       ├── deployment.yml    # Kubernetes Deployment
│       ├── service.yml       # Kubernetes Service
│       ├── hpa.yml           # Horizontal Pod Autoscaler
│       └── prometheus/       # Monitoring configs
│
├── dockerfile                # Docker image instructions
├── package.json              # Node.js project metadata
├── package-lock.json         # Dependency lock file
├── server.js                 # Main backend server
├── service-monitor.yaml      # Prometheus ServiceMonitor
└── README.md                 # Documentation
#

# //Features
Simple ecommerce backend using Node.js + Express
SQLite database (ecom.db) for easy local development
Static frontend (index.html)
Dockerfile for containerized deployment
Kubernetes manifests for production setup
HPA + Prometheus monitoring support
//

1.Install dependencies
npm install

2.Start the Server
node server.js

this app runs at
http://localhost:3000

Run with Docker
docker build -t ecommerce-platform .
docker run -p 3000:3000 ecommerce-platform

Deploy on Kubernetes
kubectl apply -f deployment.yml
kubectl apply -f service.yml
kubectl apply -f hpa.yml


Technologies Used
Node.js / Express
SQLite DB
HTML, CSS, JavaScript
Docker
Kubernetes (Deployment, Service, HPA)
Prometheus Monitoring
