docker build . -t oci.smeago.com:5000/canyon-cards
docker push oci.smeago.com:5000/canyon-cards
kubectl rollout restart deployment canyon-cards-deployment