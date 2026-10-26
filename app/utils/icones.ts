export interface Access {
  name: string;
  text: string;
}
export function getTransportIcon(transportType: string) {
  switch (transportType?.toLowerCase()) {
    case "tram":
      return "i-mdi-tram";
    case "train":
      return "i-mdi-train";
    case "bus":
      return "i-mdi-bus";
    case "métro":
      return "i-mdi-subway-variant"; // Using subway icon for métro
    case "metro":
      return "i-mdi-subway-variant"; // Using subway icon for métro
    case "rer":
      return "i-mdi-train-variant"; // Using a train variant for RER
    default:
      return "i-mdi-help-circle"; // Default icon for unknown transport types
  }
}
