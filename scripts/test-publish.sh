docker build . -t oci.smeago.com:5000/test-canyon-cards
docker push oci.smeago.com:5000/test-canyon-cards
kubectl rollout restart deployment cards-testing