import { getWindowElectron } from "@/getWindowElectron";
import { useWhenViewed } from "@/lib/hooks/useWhenViewed";
import { GetFilesAndFoldersInDirectoryItem } from "@common/Contracts";
import { useState } from "react";
import { videoThumbnailCache } from "../../videoThumbnailCache";

export function VideoThumbnail({
  item,
  fullPath,
}: {
  item: GetFilesAndFoldersInDirectoryItem;
  fullPath: string;
}) {
  const [data, setData] = useState<string | null>(null);

  const ref = useWhenViewed(() => {
    videoThumbnailCache
      .getOrGenerate(fullPath, item.modifiedTimestamp, () =>
        getWindowElectron().generateVideoThumbnail(fullPath),
      )
      .then(setData)
      .catch((error: unknown) => {
        console.error(`Failed to generate video thumbnail for ${fullPath}:`, error);
        setData(null);
      });
  });

  return (
    <div
      ref={ref}
      className="w-full h-full flex items-center justify-center overflow-hidden bg-base-200"
    >
      {data && (
        <img
          src={data}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
