FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

COPY package.json ./
RUN npm install

COPY index.js ./

# Usage: docker run zoom-bots <meeting-id> <passcode> <num-users>
ENTRYPOINT ["node", "index.js"]
