# Configuración del repositorio en GitHub

Pasos para la parte de la Etapa 0 que depende del remoto. Se corren una sola vez.

> **Visibilidad.** En el plan gratuito de GitHub, GitHub Pages y la protección de ramas solo
> funcionan en repositorios **públicos** (sección 11 de los lineamientos). Antes de este paso,
> el repo tiene que ser público. Primero confirmá que `fuentes/` no aparezca en ningún commit:
>
> ```bash
> git log --all --name-only --format= | grep -c '^fuentes/'
> ```
>
> El resultado tiene que ser `0`.

## 0. Requisitos

- [GitHub CLI](https://cli.github.com/), instalada (`winget install --id GitHub.cli`) y
  autenticada con la cuenta dueña del repo (`gh auth login`).
- Remoto configurado y `main` subida:

  ```bash
  git remote add origin git@github.com:frannmv/time-to-learn.git
  git push -u origin main
  ```

## 1. GitHub Pages

En **Settings → Pages → Build and deployment → Source**, elegir **GitHub Actions**. O por CLI:

```bash
gh api -X POST repos/frannmv/time-to-learn/pages -f build_type=workflow
```

El workflow `deploy.yml` publica en <https://frannmv.github.io/time-to-learn/> en cada push a
`main`.

## 2. Proteger `main`

Exige PR, que la CI pase (job «Lint, tipos, tests y build») y prohíbe force-push y borrado.
El job tiene que haber corrido al menos una vez para que GitHub lo reconozca como check.

```bash
gh api -X PUT repos/frannmv/time-to-learn/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": { "strict": true, "contexts": ["Lint, tipos, tests y build"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

## 3. Etiquetas

```bash
gh label create "módulo"        --color 1d76db --description "Nuevo módulo de protocolo"
gh label create "error técnico" --color d93f0b --description "Dato técnico incorrecto en el contenido"
gh label create "futuro"        --color c5def5 --description "Idea fuera de la etapa en curso"
```

## 4. Milestones (uno por etapa)

```bash
for m in \
  "Etapa 0 · Fundaciones del repositorio" \
  "Etapa 1 · Sistema base y componentes compartidos" \
  "Etapa 2 · Modelo OSI y encapsulamiento" \
  "Etapa 3 · Ethernet" \
  "Etapa 4 · Bridges y switches" \
  "Etapa 5 · Spanning Tree Protocol" \
  "Etapa 6 · VLAN" \
  "Etapa 7 · IP, ARP y subnetting" \
  "Etapa 8 · Ruteo, ICMP y VPN" \
  "Etapa 9 · TCP y UDP" \
  "Etapa 10 · DHCP y DNS" \
  "Etapa 11 · Wireless LAN" \
  "Etapa 12 · WAN, HDLC y Frame Relay" \
  "Etapa 13 · ATM y MPLS" \
  "Etapa 14 · Escenario integrador" \
  "Etapa 15 · Pulido y lanzamiento"; do
  gh api repos/frannmv/time-to-learn/milestones -f title="$m"
done
```

## 5. Tablero

Crear un proyecto (GitHub Projects) con las columnas **Pendiente / En curso / En revisión /
Hecho** y vincularlo al repositorio:

```bash
gh project create --owner frannmv --title "TimeToLearn"
```

Las columnas se ajustan en la vista Board del proyecto (campo _Status_).

## 6. Verificar la Etapa 0

1. Abrir un PR con un test roto y confirmar que la CI lo bloquea.
2. Confirmar que el sitio responde en <https://frannmv.github.io/time-to-learn/>.
3. Crear el tag `v0.0.1`.
