# Ubuntu 24.04: CLI por defecto y GNOME bajo demanda

Runbook del portátil de casa usado como servidor (Ubuntu **24.04.4 LTS**, Noble). Objetivo: arrancar en consola (menos RAM/CPU), conservar GNOME instalado y levantar el escritorio solo cuando haga falta.

**Host confirmado:** Ubuntu 24.04.4 LTS (Noble).

## Decisión

- **No** desinstalar `ubuntu-desktop` / GNOME.
- Target de arranque: `multi-user.target` (CLI, sin display manager).
- GUI bajo demanda: servicio `gdm3` (GNOME Display Manager).
- Un reboot solo sirve para **validar** que el arranque queda en CLI. El cambio de default ya persiste sin reiniciar.

## Diagnóstico (antes de tocar nada)

```bash
lsb_release -a
free -h
systemctl get-default
systemctl status gdm3 --no-pager
```

Interpretación:

| Comando | Qué mirar |
|---------|-----------|
| `lsb_release -a` | `Description: Ubuntu 24.04.4 LTS` y `Codename: noble` |
| `free -h` | RAM usada con sesión gráfica vs CLI |
| `systemctl get-default` | Hoy suele ser `graphical.target`; después debe ser `multi-user.target` |
| `systemctl status gdm3` | Si GDM está `active`, hay sesión gráfica disponible |

## Cambio seguro (default a CLI)

```bash
sudo systemctl set-default multi-user.target
systemctl get-default
```

Opcional, **sin reboot**, para bajar a CLI ahora (cierra la sesión gráfica actual):

```bash
sudo systemctl isolate multi-user.target
```

Revertir el default a escritorio al arrancar:

```bash
sudo systemctl set-default graphical.target
```

## Scripts `start-gui` / `stop-gui`

Wrapper: `~/bin/gui-control.sh`. Aliases o scripts en `~/bin` (añade `~/bin` al `PATH` si no está).

### `~/bin/gui-control.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: gui-control.sh start|stop" >&2
  exit 1
}

[[ $# -eq 1 ]] || usage

case "$1" in
  start)
    if systemctl is-active --quiet gdm3; then
      echo "gdm3 already active"
      exit 0
    fi
    sudo systemctl start gdm3
    echo "gdm3 started"
    ;;
  stop)
    sudo systemctl isolate multi-user.target
    echo "isolated multi-user.target"
    ;;
  *)
    usage
    ;;
esac
```

```bash
mkdir -p ~/bin
chmod +x ~/bin/gui-control.sh
```

### Aliases (p. ej. `~/.bashrc`)

```bash
alias start-gui='~/bin/gui-control.sh start'
alias stop-gui='~/bin/gui-control.sh stop'
```

- **start:** `systemctl start gdm3` (no cambia el default de arranque).
- **stop:** `isolate multi-user.target` (baja GDM y vuelve a CLI).
- El script sale distinto de 0 si `sudo` o `systemctl` fallan (`set -e`).

## Extras de portátil-servidor

### Tapa (lid) — no suspender al cerrar

En `/etc/systemd/logind.conf`:

```ini
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

Luego: `sudo systemctl restart systemd-logind`.

### Swappiness

`/etc/sysctl.d/99-swappiness.conf`:

```
vm.swappiness=10
```

Aplicar: `sudo sysctl --system` (o `sudo sysctl vm.swappiness=10`).

### Límite de journald

En `/etc/systemd/journald.conf` (o drop-in en `journald.conf.d`):

```ini
SystemMaxUse=200M
```

Luego: `sudo systemctl restart systemd-journald`.

### SSH y monitorización

- SSH: `sudo apt install openssh-server` y `sudo systemctl enable --now ssh`.
- Procesos / recursos: `htop`, `btop`, `glances` (`sudo apt install htop btop glances`).

## Plan de acción numerado

1. Diagnóstico: `lsb_release`, `free -h`, `get-default`, `status gdm3`.
2. Instalar `~/bin/gui-control.sh` y aliases `start-gui` / `stop-gui`.
3. `sudo systemctl set-default multi-user.target` y comprobar `get-default`.
4. (Opcional ahora) `sudo systemctl isolate multi-user.target` o `stop-gui`.
5. Lid ignore, swappiness=10, tope de journald, SSH, htop/btop/glances.
6. **Reboot solo para validar** arranque en CLI; después `start-gui` debe levantar GNOME vía gdm3.

## Notas

- `graphical.target` tira de GDM; `multi-user.target` no. GNOME sigue instalado.
- No hace falta `apt remove ubuntu-desktop`.
- Si GDM no arranca: `journalctl -u gdm3 -b --no-pager`.
