FROM node:19-slim

# Dentro dessa imagem node:19-slim, já temos um usuário chamado node
# portanto quero que meu workdir seja em:
WORKDIR /home/node/app

# Por padrão o usuário é root, portanto vamos mudar
# para o usuário node
USER node

# Para o container ficar executando para sempre
CMD [ "tail", "-f", "/dev/null" ]
# ENTRYPOINT [ "npm", "run", "dev" ]