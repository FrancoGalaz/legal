---
version: alpha
name: Legal Agent CL
description: SaaS legal chileno — precisión profesional con claridad moderna.
colors:
  primary: "#111827"
  secondary: "#6B7280"
  tertiary: "#2563EB"
  tertiary-hover: "#1D4ED8"
  neutral: "#F9FAFB"
  surface: "#FFFFFF"
  border: "#E5E7EB"
  border-focus: "#93C5FD"
  success: "#059669"
  warning: "#D97706"
  danger: "#DC2626"
  on-primary: "#FFFFFF"
  on-tertiary: "#FFFFFF"
  muted-text: "#9CA3AF"
typography:
  h1:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  h2:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  h3:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.35
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    lineHeight: 1.65
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: "0.04em"
  mono:
    fontFamily: "JetBrains Mono"
    fontSize: 0.875rem
    lineHeight: 1.5
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    padding: 12px 24px
  button-primary-hover:
    backgroundColor: "{colors.tertiary-hover}"
    textColor: "{colors.on-tertiary}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.tertiary}"
    rounded: "{rounded.sm}"
    padding: 12px 24px
    border: "1px solid {colors.border-focus}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 24px
    border: "1px solid {colors.border}"
  badge:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 12px 16px
    border: "1px solid {colors.border}"
---

## Overview

Legal Agent CL proyecta confianza institucional con claridad digital. El diseño prioriza la legibilidad, la jerarquía tipográfica y el uso deliberado de un solo acento de color para acciones. Evoca precisión legal sin pesadez — limpio, directo, sin decoración innecesaria.

## Colors

- **Primary ({colors.primary}):** Texto principal, headlines, elementos de alta importancia.
- **Secondary ({colors.secondary}):** Texto secundario, metadatos, labels.
- **Tertiary ({colors.tertiary}):** Azul institucional — driver de interacción (botones, links, estados activos).
- **Neutral ({colors.neutral}):** Fondo de página, superficies de bajo contraste.
- **Surface ({colors.surface}):** Tarjetas, formularios, paneles principales.
- **Border ({colors.border}):** Bordes sutiles, separadores.
- **Muted ({colors.muted-text}):** Placeholders, texto deshabilitado.

## Typography

Inter como familia única. La jerarquía se construye con peso y tamaño, no con familias distintas. Los headlines usan letter-spacing negativo para mayor presencia; el cuerpo usa tracking normal.

## Layout

Escala de spacing en base 4px. `md` (16px) para gaps internos de componentes, `lg` (24px) entre componentes, `xl` (40px) entre secciones, `2xl` (64px) para separación de bloques mayores.

## Shapes

Bordes redondeados moderados. `sm` en elementos interactivos, `md` en tarjetas y superficies. `full` exclusivamente para badges tipo pill y avatares.

## Components

- `button-primary` es la única acción de alto énfasis por pantalla.
- `card` es la superficie por defecto para contenido agrupado. Borde sutil, sin sombra.
- `badge` para estados, tags y metadata compacta.
- `input` campos de formulario con borde mínimo que se resalta en foco.

## Do's and Don'ts

- **Do** usar referencias de tokens (`{colors.primary}`) en lugar de hex literal.
- **Do** mantener un solo acento de color para no diluir la señal.
- **Don't** introducir colores fuera de la paleta — extender la paleta primero.
- **Don't** anidar variantes de componentes. `button-primary-hover` es sibling, no hijo.
- **Don't** usar sombras decorativas por defecto.
