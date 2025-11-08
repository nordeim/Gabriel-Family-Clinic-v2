// @/styles/theme.ts
"use client";

import { createTheme, MantineColorsTuple } from "@mantine/core";

// Generating a 10-shade tuple for our primary color
const primaryColor: MantineColorsTuple = [
  "#ffe3e3",
  "#ffc9c9",
  "#ffa8a8",
  "#ff8585",
  "#ff6b6b", // Main shade at index 4
  "#ff5f5f",
  "#ff5c5c",
  "#e64b4b",
  "#cf4343",
  "#b83939",
];

export const theme = createTheme({
  fontFamily: "Inter, sans-serif",
  primaryColor: "primary",
  colors: {
    primary: primaryColor,
  },
  headings: {
    fontFamily: "Inter, sans-serif",
  },
  fontSizes: {
    xs: "14px",
    sm: "16px",
    md: "18px", // Base size
    lg: "20px",
    xl: "22px",
  },
});
