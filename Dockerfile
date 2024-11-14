# Folosește o imagine de bază NodeJS
FROM node:18

# Setează directorul de lucru
WORKDIR /app

# Copiază fișierele package.json și package-lock.json
COPY package*.json ./

# Instalează dependențele
RUN npm install

# Copiază restul fișierelor aplicației
COPY . .

# Expune portul pe care rulează aplicația (de exemplu, 3000)
EXPOSE 3000

# Comanda de rulare a aplicației
CMD ["npm", "run", "devStart"]
