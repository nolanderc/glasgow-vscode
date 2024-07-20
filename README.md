
# glasgow

> A Language Server for WGSL (WebGPU Shading Language)


## Features

- Completions:
    - Local functions/variables/types.
    - Fields and swizzles.
    - Builtin types and functions (`dot`, `reflect`, `textureSample`, `vec3`, `mat4x2`, etc.)
- Hover Documentation:
    - Funtion signatures.
    - Variable types.
    - Includes builtin types and functions. Text is taken from the WGSL specification.
- Goto Definition
- Find all References
- Rename
- Formatter

# Requirements

This extension uses `cargo` to install the `glasgow` binary. If you don't
already have it, follow the instructions at
[https://rustup.rs/](https://rustup.rs/).

You can also choose to manually install the binary by running:

```sh
cargo install glasgow
```

