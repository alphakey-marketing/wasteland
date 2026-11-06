# UI font dependency

`NotoSansTC-subset.ttf` is a subset of Noto Sans TC, downloaded from
https://github.com/google/fonts/tree/main/ofl/notosanstc on 2026-11-05.
License: SIL Open Font License 1.1, retained in `OFL.txt`.

The subset contains current game text, ASCII and UI symbols. Regenerate it when
adding text outside that character set. This distributable font dependency is
needed because Web builds cannot use Godot's native system-font fallback.
Game models, textures and shaders remain original project assets; this font is
OFL rather than CC0. GUT is a separate MIT-licensed development dependency.
