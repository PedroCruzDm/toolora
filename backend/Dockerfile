# Stage 1: Build com Gradle recente
FROM gradle:8.14-jdk17-alpine AS build
WORKDIR /app
COPY . .
# Build sem testes para agilizar (remova -x test se quiser rodar testes no CI)
RUN gradle build -x test --no-daemon

# Stage 2: Runtime limpo (só o JAR)
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
# Copia o JAR gerado (ajuste o nome se seu projeto gera algo diferente de *.jar)
COPY --from=build /app/build/libs/*.jar app.jar
# Se precisar de resources ou config extras, copie aqui também
EXPOSE 8080
# Modo produção (mais estável em container)
CMD ["java", "-jar", "app.jar"]
# Para dev com hot-reload (se tiver spring-boot-devtools ativado):
# CMD ["java", "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", "-jar", "app.jar"]