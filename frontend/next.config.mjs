import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: (config) => {
		config.resolve.alias["@react-native-async-storage/async-storage"] = path.resolve("./src/shims/asyncStorage.ts");
		return config;
	},
};

export default nextConfig;
