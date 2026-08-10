import { Live2DCharacter } from "../../Live2DCharacter";
import type { CharacterViewProps } from "../../types";
import { haruDefinition } from "./config";

export function HaruCharacter(props: CharacterViewProps) {
  return <Live2DCharacter character={haruDefinition} {...props} />;
}
