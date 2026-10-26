export function useMapLink(initialAddress = "") {
  const address = ref(initialAddress);

  const userAgent = computed(() => navigator?.userAgent || window?.opera);

  const isIOS = computed(
    () => /iPad|iPhone|iPod/.test(userAgent.value) && !window.MSStream
  );
  const isAndroid = computed(() => /android/i.test(userAgent.value));

  const getMapLink = () => {
    const encodedAddress = encodeURIComponent(address.value);

    if (isIOS.value) {
      return `http://maps.apple.com/?address=${encodedAddress}`;
    }

    if (isAndroid.value) {
      return `geo:0,0?q=${encodedAddress}`;
    }

    // Default to Google Maps for other devices
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  };

  const openMap = () => {
    const mapUrl = getMapLink();
    window.open(mapUrl, "_blank");
  };

  return {
    address,
    getMapLink,
    openMap,
  };
}
