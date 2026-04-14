#!/bin/bash
# Script para iniciar todos los servicios (Mac/Linux)
# Uso: chmod +x start-all-services.sh && ./start-all-services.sh

echo "======================================"
echo "🚀 INICIANDO TODOS LOS SERVICIOS"
echo "======================================"
echo ""

# Colores para la terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Trap para detener todos los procesos background cuando se cierre el script
trap "echo ''; echo 'Deteniendo todos los servicios...'; kill $(jobs -p) 2>/dev/null; exit" INT TERM

# API Gateway
echo -e "${YELLOW}▶ Iniciando API Gateway (puerto 3000)...${NC}"
npm run start:gateway &
GATEWAY_PID=$!
sleep 1

# Users Service
echo -e "${MAGENTA}▶ Iniciando Users Service (puerto 3001)...${NC}"
npm run start:users &
USERS_PID=$!
sleep 1

# Groups Service
echo -e "${CYAN}▶ Iniciando Groups Service (puerto 3002)...${NC}"
npm run start:groups &
GROUPS_PID=$!
sleep 1

# Tickets Service
echo -e "${GREEN}▶ Iniciando Tickets Service (puerto 3003)...${NC}"
npm run start:tickets &
TICKETS_PID=$!
sleep 1

# Angular Frontend
echo -e "${BLUE}▶ Iniciando Angular Frontend (puerto 4200)...${NC}"
npm run start &
FRONTEND_PID=$!

echo ""
echo "======================================"
echo -e "${GREEN}✓ TODOS LOS SERVICIOS HAN SIDO INICIADOS${NC}"
echo "======================================"
echo ""
echo "Servicios ejecutándose en:"
echo -e "${YELLOW}  • API Gateway: http://localhost:3000${NC}"
echo -e "${MAGENTA}  • Users Service: http://localhost:3001${NC}"
echo -e "${CYAN}  • Groups Service: http://localhost:3002${NC}"
echo -e "${GREEN}  • Tickets Service: http://localhost:3003${NC}"
echo -e "${BLUE}  • Frontend: http://localhost:4200${NC}"
echo ""
echo -e "${CYAN}API Gateway actuará como proxy central${NC}"
echo -e "${YELLOW}Presiona CTRL+C para detener todos los servicios${NC}"
echo ""

# Mantener el script corriendo
wait
