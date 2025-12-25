import { GenericResult } from "../../../common/GenericError.js";

export namespace Archive {
  export type ArchiveOpts = {
    source: string;
    destination: string;
    progressCallback: (progress: number) => void;
    abortSignal: AbortSignal;
  };

  export type ArchiveResult = GenericResult<void>;

  export type UnarchiveOpts = ArchiveOpts;

  export type UnarchiveResult = GenericResult<void>;
}
