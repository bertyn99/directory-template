/**
 * Extract unique objects from an array based on a unique key.
 * If multiple objects have the same unique key, the one with more properties is stored.
 * @param arr The array of objects to extract unique objects from
 * @param uniqueKey The key to use to determine uniqueness
 * @param excludeKeys An array of keys to exclude when comparing objects
 * @returns An array of unique objects
 * @example
 * const arr = [
 *  { id: 1, name: "Alice" },
 * { id: 2, name: "Bob" },
 * { id: 1, name: "Charlie" },
 * { id: 3, name: "David" },
 * ];
 * const uniqueObjects = extractUniqueObjects(arr, "id");
 * console.log(uniqueObjects);
 * // Output: [{ id: 1, name: "Charlie" }, { id: 2, name: "Bob" }, { id: 3, name: "David" }]
 * @example
 * const arr = [
 * { id: 1, name: "Alice" },
 * { id: 2, name: "Bob" },
 * { id: 1, name: "Charlie" },
 * { id: 3, name: "David" },
 * ];
 * const uniqueObjects = extractUniqueObjects(arr, "id", ["name"]);
 * console.log(uniqueObjects);
 * // Output: [{ id: 1 }, { id: 2, name: "Bob" }, { id: 3, name: "David" }]
 *
 *
 */
export function extractUniqueObjects<T extends object>(
  arr: T[],
  uniqueKey: keyof T,
  excludeKeys: (keyof T)[] = [],
): T[] {
  // Ensure excludeKeys is always an array
  const keysToExclude = Array.isArray(excludeKeys) ? excludeKeys : [excludeKeys];

  // Use a Map to store unique objects
  const uniqueMap = new Map<T[keyof T], T>();

  arr.forEach((item) => {
    if (item[uniqueKey]) {
      // Create a new object without the excluded keys
      const objectToStore = Object.keys(item).reduce((acc, key) => {
        if (!keysToExclude.includes(key as keyof T)) {
          acc[key as keyof T] = item[key as keyof T];
        }
        return acc;
      }, {} as T);

      // If this uniqueKey hasn't been seen before, or if the current object has more properties,
      // update the entry in the Map
      if (
        !uniqueMap.has(item[uniqueKey]) ||
        Object.keys(objectToStore).length > Object.keys(uniqueMap.get(item[uniqueKey])!).length
      ) {
        uniqueMap.set(item[uniqueKey], objectToStore);
      }
    }
  });

  // Convert the Map values back to an array
  return Array.from(uniqueMap.values());
}

export function parseVenueText(text: string) {
  const result = {
    description: "",
    competition: "",
    equipment: "",
    keyPoint: "",
  };

  // Section marker regexes, kept for reference — the split() call below
  // encodes the same tokens inline.
  const _keyPointMarker = /\[\[keyPoint\]\]/g;
  const _equipmentMarker = /\[\[equipment\]\]/g;
  const _competitionMarker = /\[\[competition\]\]/g;

  // Splitting sections
  const sections = text.split(/\[\[(keyPoint|equipment|competition)\]\]/g);

  let currentSection = "description";

  sections.forEach((section, _index) => {
    if (section === "keyPoint") {
      currentSection = "keyPoint";
    } else if (section === "equipment") {
      currentSection = "equipment";
    } else if (section === "competition") {
      currentSection = "competition";
    } else {
      // Clean and trim the section
      const cleanSection = section.trim();

      if (currentSection === "keyPoint") {
        result.keyPoint += cleanSection + "\n";
      } else if (currentSection === "equipment") {
        result.equipment += cleanSection + "\n";
      } else if (currentSection === "competition") {
        result.competition += cleanSection + "\n";
      } else {
        result.description += cleanSection + "\n";
      }
    }
  });

  // Trim the trailing newline from each section
  (Object.keys(result) as Array<keyof typeof result>).forEach((key) => {
    result[key] = result[key].trim();
  });

  return result;
}
