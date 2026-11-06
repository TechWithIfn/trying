"use client";

import FacebookDownloader from "./FacebookDownloader";
import { resolveThreadsUrl } from "@/services/api";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof FacebookDownloader>, "resolveUrl" | "inputLabel" | "platformName" | "resultMode">;

export default function ThreadsDownloader(props: Props) {
  return (
    <FacebookDownloader
      {...props}
      resolveUrl={resolveThreadsUrl}
      inputLabel="Threads post URL"
      platformName="Threads"
      resultMode="auto"
    />
  );
}
