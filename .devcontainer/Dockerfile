FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

# Installation de Bun (accessible pour l'utilisateur non-root `node`)
# Le script installe Bun dans $BUN_INSTALL (sinon il irait dans /root/.bun, illisible par `node`).
ENV BUN_INSTALL=/usr/local/bun
RUN mkdir -p ${BUN_INSTALL} \
    && curl -fsSL https://bun.sh/install | bash \
    && chmod -R a+rX ${BUN_INSTALL}
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

# Optionnel : Outils additionnels pour les tests ou le debug
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspaces/
