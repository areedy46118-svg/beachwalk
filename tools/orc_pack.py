#!/usr/bin/env python3
"""Pack Oscar Creativo's orc into `assets/orc.glb` — the third man at the bar.

    python3 tools/gltfpack.py \
        "$HOME/Downloads/character_3d_orco_free_by_oscar_creativo/scene.gltf" \
        assets/orc.glb --tex 1024 --normal-tex 512 --drop-mr --no-clips \
        --drop TANGENT,TEXCOORD_1,TEXCOORD_2,COLOR_0

That one line is the whole build, and the reason this file is a note rather
than a program is the one thing it must NOT do.

HE IS SHIPPED EXACT — 305,522 triangles over 29 meshes, every material, every
map — because the only way to bring that down breaks him. A Blender round trip
is what decimates a rigged character in this repo (vertex clustering keeps
positions and indices and throws the UVs and the skin weights away, which is
the captain's head's own lesson), and this rip will not survive one: its
inverse-bind matrices are IDENTITY and its rest pose is carried entirely by the
NODE TRANSFORMS, so Blender's importer rebuilds a different skeleton and writes
it back out. Measured on the round-tripped file, the right upper arm came out
with a 175 cm offset from its clavicle, the whole bind collapsed onto the
origin, and every clip retargeted onto that exploded — the arms out sideways,
the sword two metres in front of his chest. Importing with
`bone_heuristic='BLENDER'` does not save it. So the model is not decimated, and
what pays for it is everything else:

  * THE METALLIC MAPS GO (`--drop-mr`). Three quarters of him is metal by
    material and this game has no environment map: METALNESS IS A TRAP, for the
    sixth time. 450 MB of 4K PNG becomes 5.4 MB of 1024 albedo and 512 normal.
  * AND THE DEMO CLIP GOES (`--no-clips`), which is HALF THE FILE. `Motion` is
    324 channels of Sketchfab turntable — 14.9 MB against 11.7 MB of geometry —
    and he needs none of it: his bind pose is sane (measured in the game: head
    1.94 m, the sword hand at 1.47) and every clip he fights with is the Great
    Sword Pack, retargeted (`tools/ntar_moves.py -- orc`).

32.3 MB becomes 17.2, which is the sea keep's own bargain: the owner asked for
the model and the model is what he gets.
"""
