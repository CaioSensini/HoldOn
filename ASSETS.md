# ASSETS.md — Catálogo de assets do Float

Este arquivo lista **todos os paths esperados** pelo `PreloadScene`. Ao colocar um arquivo real no path indicado em `public/assets/...`, o jogo automaticamente usa o arquivo real em vez do placeholder gerado proceduralmente.

> **Como funciona:** `PreloadScene` tenta `this.load.image(key, path)`. Se o arquivo não existe (404), `loaderror` é capturado silenciosamente e o `generateAllPlaceholders(scene)` em `create()` gera um Canvas placeholder com a mesma chave. Substituir um por vez é seguro.

---

## Recomendações gerais

- **Formato:** PNG com transparência (RGBA), ou WebP se quiser menor.
- **Resolução do jogo:** 1280×720 (landscape). Sprites podem ser desenhados em até 2× pra retina.
- **Estilo sugerido:** flat / vetorizado, contornos escuros (#0b0f1a) para destacar contra o fundo. Mas é livre.
- **Hitboxes** estão hard-coded em `entities/Obstacle.ts` etc. Se mudar dimensões drasticamente, ajuste lá também.

---

## Player / Skins (15)

Path base: `public/assets/images/skins/`
Dimensão sugerida: **64×64px** (ou 128×128 se 2×). Centralize o sprite — é apresentado com origin (0.5, 0.5).

| Path | Key Phaser | Raridade | Função |
|---|---|---|---|
| `skins/rock.png` | `skin_rock` | common | Skin default. |
| `skins/arrow.png` | `skin_arrow` | common | Triângulo apontado pra frente. |
| `skins/coin.png` | `skin_coin` | common | Moeda dourada. |
| `skins/donut.png` | `skin_donut` | common | Donut com glacê rosa. |
| `skins/leaf.png` | `skin_leaf` | common | Folha verde. |
| `skins/drop.png` | `skin_drop` | common | Gota d'água. |
| `skins/dice.png` | `skin_dice` | common | Dado branco. |
| `skins/heart.png` | `skin_heart` | common | Coração vermelho. |
| `skins/boomerang.png` | `skin_boomerang` | rare | Bumerangue roxo. |
| `skins/kunai.png` | `skin_kunai` | rare | Kunai cinza. |
| `skins/crystal.png` | `skin_crystal` | rare | Cristal azul claro. |
| `skins/lightning.png` | `skin_lightning` | rare | Raio amarelo (recompensa de remove_ads IAP). |
| `skins/fireball.png` | `skin_fireball` | epic | Bola de fogo laranja. |
| `skins/star.png` | `skin_star` | epic | Estrela dourada. |
| `skins/rainbow_pulse.png` | `skin_rainbow` | legendary | Pulso/anel iridescente. |

---

## Obstáculos (8 sprites para 7 tipos)

Path base: `public/assets/images/obstacles/`

| Path | Key | Tamanho | Descrição |
|---|---|---|---|
| `obstacles/wall_high.png` | `obs_wall_high` | 60×220 | Bloco vertical no chão, intransponível por baixo. |
| `obstacles/beam_low.png` | `obs_beam_low` | 220×60 | Trave horizontal suspensa, força ficar no chão. |
| `obstacles/pit.png` | `obs_pit` | 220×80 | Espinhos no chão; sprite âncora bottom-center. |
| `obstacles/moving.png` | `obs_moving` | 70×120 | Bloco que oscila verticalmente. |
| `obstacles/gap_top.png` | `obs_gap_top` | 80×qualquer | Bloco superior do narrow_gap (esticado via `setDisplaySize`). |
| `obstacles/gap_bot.png` | `obs_gap_bot` | 80×qualquer | Bloco inferior do narrow_gap. |
| `obstacles/combo.png` | `obs_combo` | 60×180 | Bloco da sequência combo (alterna chão/ar). |
| `obstacles/breakable.png` | `obs_breakable` | 80×80 | Caixa quebrável (Rocket destrói). |
| `obstacles/slide_gate.png` | `obs_slide_gate` | 240×54 | Teto baixo perto do chão; só passa deitado. |
| `obstacles/bonus_hole.png` | `obs_bonus_hole` | 214×78 | Corte discreto na estrada/chão para entrada no subsolo, ativado ao passar deitado. |
| `obstacles/pipe_exit.png` | `obs_pipe_exit` | 170×132 | Saída do subsolo com abertura no teto e parede se seguir reto. |

> **Atenção a origens:** `pit` é desenhado com origin (0.5, 1) pra apoiar no chão. `narrow_gap` usa dois sprites esticados para preencher o vão.

---

## Moedas (5 tiers)

Path base: `public/assets/images/coins/`
Dimensão sugerida: **32×32px**.

| Path | Key | Valor base |
|---|---|---|
| `coins/bronze.png` | `coin_bronze` | 1 |
| `coins/silver.png` | `coin_silver` | 5 |
| `coins/gold.png` | `coin_gold` | 10 |
| `coins/diamond.png` | `coin_diamond` | 25 |
| `coins/legendary.png` | `coin_legendary` | 100 |

A moeda gira (anim de tween) e tem um pulso sutil — basta um sprite estático.

---

## Power-ups (9)

Path base: `public/assets/images/powerups/`
Dimensão sugerida: **48×48px**, ícone com fundo circular colorido.

| Path | Key | Cor de glow | Efeito |
|---|---|---|---|
| `powerups/rocket.png` | `pu_rocket` | vermelho | 7s invencível + speed×1.5 + quebra obstáculos |
| `powerups/shield.png` | `pu_shield` | ciano | Absorve 1 hit |
| `powerups/magnet.png` | `pu_magnet` | roxo | 8s atrai moedas |
| `powerups/coins2x.png` | `pu_coins2x` | dourado | 10s dobra valor de moedas |
| `powerups/slowmo.png` | `pu_slowmo` | verde | 5s mundo a 60% |
| `powerups/phantom.png` | `pu_phantom` | cinza claro | 6s atravessa obstáculos do chão |
| `powerups/revive.png` | `pu_revive` | rosa | 1 ressurreição grátis |
| `powerups/coinrain.png` | `pu_coinrain` | amarelo | 4s spawna chuva de moedas |
| `powerups/mini.png` | `pu_mini` | verde água | 7s hitbox 50% menor |

---

## Trails (5)

Path base: `public/assets/images/trails/`
Dimensão sugerida: **24×24px** (partícula de halo radial). O Phaser aplica `tint` dinamicamente, então **textura branca/clara funciona melhor** se quiser uma cor variável.

| Path | Key |
|---|---|
| `trails/default.png` | `trail_default` |
| `trails/fire.png` | `trail_fire` |
| `trails/sparkle.png` | `trail_sparkle` |
| `trails/rainbow.png` | `trail_rainbow` |
| `trails/smoke.png` | `trail_smoke` |

---

## Partículas

Path base: `public/assets/images/particles/`

| Path | Key | Dimensão |
|---|---|---|
| `particles/spark.png` | `spark` | 16×16 (radial brilhante) |
| `particles/pixel.png` | `pixel` | 4×4 (pixel sólido para explosão de moeda/morte) |

---

## Backgrounds de bioma (5)

Path base: `public/assets/images/biomes/`
Dimensão **1280×720** (mesma do jogo).

| Path | Key | Bioma |
|---|---|---|
| `biomes/forest.png` | `bg_forest` | Forest (0–1.000m) |
| `biomes/cave.png` | `bg_cave` | Cave (1.000–2.500m) |
| `biomes/temple.png` | `bg_temple` | Temple (2.500–5.000m) |
| `biomes/space.png` | `bg_space` | Space (5.000–8.000m) |
| `biomes/underworld.png` | `bg_underworld` | Underworld (8.000m+) |

> **Parallax futuro:** atualmente os backgrounds são imagens estáticas com crossfade. Para parallax real, edite `BiomeManager.init()` adicionando 2-3 camadas com velocidades diferentes (split em `*_far.png`, `*_mid.png`, `*_near.png`).

---

## UI

Path base: `public/assets/images/ui/`

| Path | Key | Dimensão | Notas |
|---|---|---|---|
| `ui/button.png` | `ui_btn` | 240×64 (9-slice ideal) | Atualmente botões são `Rectangle` Phaser; pra usar este, refatorar `Button.ts`. |
| `ui/panel.png` | `ui_panel` | 320×200 | Idem, pra Modal. |

> Os botões/painéis atuais são desenhados com `Rectangle` + `setStrokeStyle`, sem 9-slice. Se quiser usar imagens, troque o `bg` em `ui/Button.ts` e `ui/Modal.ts`.

---

## Áudio (futuro)

Atualmente o jogo gera tons via Web Audio API em `systems/AudioSystem.ts`. Para substituir por arquivos reais, recomenda-se:

| Caminho sugerido | Função | Duração ideal |
|---|---|---|
| `audio/sfx/coin.ogg` | Coletar moeda (com variação por combo) | 80–150ms |
| `audio/sfx/coin_high.ogg` | Coletar moeda (combo alto) | 80–150ms |
| `audio/sfx/powerup.ogg` | Coletar power-up | 200–400ms |
| `audio/sfx/woosh.ogg` | Rocket / boost | 250–400ms |
| `audio/sfx/impact.ogg` | Morte | 300–500ms |
| `audio/sfx/near_miss.ogg` | Near miss (sutil) | 80–120ms |
| `audio/sfx/click.ogg` | Botão UI | 40–80ms |
| `audio/music/forest_loop.ogg` | Música do Forest | loop ~30–60s |
| `audio/music/cave_loop.ogg` | Música do Cave | loop |
| `audio/music/temple_loop.ogg` | etc | loop |
| `audio/music/space_loop.ogg` | | loop |
| `audio/music/underworld_loop.ogg` | | loop |
| `audio/music/menu_loop.ogg` | Música do menu | loop |

Quando trocar:
1. Em `PreloadScene.preload()`, adicione `this.load.audio(key, path)` para cada arquivo.
2. Em `AudioSystem`, troque os `tone()` por `this.scene.sound.play(key)` (mantendo a mesma API: `playCoin`, `playImpact`, etc. — só os internals mudam).
3. Aplicar `volume` baseado em `GameState.settings.musicVolume / sfxVolume` na criação dos sons.

---

## Checklist de substituição

```
[ ] skins/rock.png
[ ] skins/arrow.png
[ ] skins/coin.png
[ ] skins/donut.png
[ ] skins/leaf.png
[ ] skins/drop.png
[ ] skins/dice.png
[ ] skins/heart.png
[ ] skins/boomerang.png
[ ] skins/kunai.png
[ ] skins/crystal.png
[ ] skins/lightning.png
[ ] skins/fireball.png
[ ] skins/star.png
[ ] skins/rainbow_pulse.png

[ ] obstacles/wall_high.png
[ ] obstacles/beam_low.png
[ ] obstacles/pit.png
[ ] obstacles/moving.png
[ ] obstacles/gap_top.png
[ ] obstacles/gap_bot.png
[ ] obstacles/combo.png
[ ] obstacles/breakable.png
[ ] obstacles/slide_gate.png
[ ] obstacles/bonus_hole.png
[ ] obstacles/pipe_exit.png

[ ] coins/bronze.png
[ ] coins/silver.png
[ ] coins/gold.png
[ ] coins/diamond.png
[ ] coins/legendary.png

[ ] powerups/rocket.png
[ ] powerups/shield.png
[ ] powerups/magnet.png
[ ] powerups/coins2x.png
[ ] powerups/slowmo.png
[ ] powerups/phantom.png
[ ] powerups/revive.png
[ ] powerups/coinrain.png
[ ] powerups/mini.png

[ ] trails/default.png
[ ] trails/fire.png
[ ] trails/sparkle.png
[ ] trails/rainbow.png
[ ] trails/smoke.png

[ ] particles/spark.png
[ ] particles/pixel.png

[ ] biomes/forest.png
[ ] biomes/cave.png
[ ] biomes/temple.png
[ ] biomes/space.png
[ ] biomes/underworld.png

[ ] ui/button.png (opcional)
[ ] ui/panel.png  (opcional)

[ ] audio/sfx/*    (futuro)
[ ] audio/music/*  (futuro)
```
