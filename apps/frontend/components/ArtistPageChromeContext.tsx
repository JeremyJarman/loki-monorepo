'use client';

import { createContext, useContext } from 'react';

export type ArtistPageChrome = { backHref: string; title: string };

export const SetArtistPageChromeContext = createContext<
  React.Dispatch<React.SetStateAction<ArtistPageChrome | null>> | null
>(null);

export function useSetArtistPageChrome() {
  return useContext(SetArtistPageChromeContext);
}
