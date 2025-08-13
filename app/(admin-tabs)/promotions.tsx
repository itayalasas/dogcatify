{
  "expo": {
    "name": "DogCatiFy",
    "slug": "dogcatify",
    "version": "8.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/logo.jpg",
    "scheme": "dogcatify",
    "userInterfaceStyle": "automatic",
    "platforms": ["ios", "android", "web"],
    "splash": {
      "image": "./assets/images/logo.jpg",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "0618d9ae-6714-46bb-adce-f4ee57fff324"
      },
      "EXPO_PUBLIC_SUPABASE_URL": "https://zkgiwamycbjcogcgqhff.supabase.co",
    console.log('promoStartDate:', promoStartDate);
    console.log('promoEndDate:', promoEndDate);
    console.log('promoImage:', promoImage ? 'Image selected' : 'No image');
    
    },
    "ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.dogcatify.app",
  "infoPlist": {
    "NSCameraUsageDescription": "Esta aplicación necesita acceso a la cámara para tomar fotos de mascotas.",
    "NSPhotoLibraryUsageDescription": "Esta aplicación necesita acceso a la galería para seleccionar fotos de mascotas.",
    "NSFaceIDUsageDescription": "Esta aplicación usa Face ID para un acceso rápido y seguro.",
    "ITSAppUsesNonExemptEncryption": false,
    "NSLocationWhenInUseUsageDescription": "Necesitamos tu ubicación para mostrar el mapa correctamente.",
    "NSLocationAlwaysAndWhenInUseUsageDescription": "Usamos tu ubicación para ofrecerte una mejor experiencia con los mapas."
  }
},
    "android": {
  "package": "com.dogcatify.app",
  "versionCode": 8,
  "adaptiveIcon": {
    "foregroundImage": "./assets/images/logo.jpg",
    "backgroundColor": "#FFFFFF"
  },
  "permissions": [
    "android.permission.CAMERA",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.USE_FINGERPRINT",
    "android.permission.USE_BIOMETRIC",
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE"
  ]
},
       "web": {
      console.log('❌ Validation failed - missing required fields');
      "favicon": "./assets/images/logo.jpg",
      "bundler": "metro",
    
    console.log('✅ Validation passed, starting creation process...');
      "output": "static",
      "build": {
      console.log('Step 1: Uploading image...');
        "babel": {
          "include": ["@expo/vector-icons"]
        console.log('Image URI:', promoImage);
        try {
          imageUrl = await uploadImage(promoImage);
          console.log('✅ Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          console.error('❌ Image upload failed:', uploadError);
          throw new Error(`Error subiendo imagen: ${uploadError.message}`);
        }
      }
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    },
    "notification": {
      "icon": "./assets/images/logo-transp.png",
      "color": "#2D6A6F"
    },
    "permissions": ["NOTIFICATIONS"],
    "privacy": "public",
    "owner": "pedro86cu"
  }
}