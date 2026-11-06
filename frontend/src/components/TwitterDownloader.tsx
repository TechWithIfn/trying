"use client";

import FacebookDownloader from "./FacebookDownloader";
import { resolveTwitterUrl } from "@/services/api";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof FacebookDownloader>, "resolveUrl" | "inputLabel" | "platformName" | "resultMode">;

export default function TwitterDownloader(props: Props) {
  return (
    <FacebookDownloader
      {...props}
      resolveUrl={resolveTwitterUrl}
      inputLabel="Twitter/X video post URL"
      platformName="Twitter/X"
    />
  );
}
