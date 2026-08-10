import { Live2DCharacter } from "../../Live2DCharacter";
import type { CharacterViewProps } from "../../types";
import { maoDefinition } from "./config";

export function MaoCharacter(props: CharacterViewProps) {
  return <Live2DCharacter character={maoDefinition} {...props} />;
}
