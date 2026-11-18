# Organizador de vida

App de iPhone (SwiftUI, iOS 17+). Fase 1: habit tracker local con SwiftData y Swift Charts.

## Abrir el proyecto

El `.xcodeproj` se genera con [XcodeGen](https://github.com/yonaskolb/XcodeGen) y no se sube al repo.

```sh
brew install xcodegen
xcodegen
open OrganizadorDeVida.xcodeproj
```

Antes de instalarla en tu iPhone, cambia `com.example.organizadordevida` en `project.yml` por tu propio identificador y elige tu equipo en Xcode (Signing & Capabilities).

## Datos

Todo se guarda en el dispositivo. No hay red, cuentas ni secretos en esta fase.
