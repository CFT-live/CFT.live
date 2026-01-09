import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'CFT.live',
        short_name: "CFT",
        description: "Web3 Smart Contract Hub",
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        categories: ['finance', 'utilities', 'productivity'],
        icons: [
            {
                "src": "/images/icon-192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/images/icon-512.png",
                "sizes": "512x512",
                "type": "image/png"
            },
        ],
    }
}