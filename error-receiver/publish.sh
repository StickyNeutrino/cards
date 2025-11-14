docker build . -t oci.smeago.com:5000/cards-error-receiver
docker push oci.smeago.com:5000/cards-error-receiver
kubectl rollout restart deployment cards-error-receiver
