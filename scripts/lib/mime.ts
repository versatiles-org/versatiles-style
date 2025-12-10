/**
 * Utility function to determine MIME type based on file extension.
 * @param filePath - Path of the file
 * @returns MIME type string
 */
export function getMimeType(filePath: string): string {
	const extension = filePath.split('.').pop()?.toLowerCase();
	switch (extension) {
		case 'html':
			return 'text/html';
		case 'css':
			return 'text/css';
		case 'js':
			return 'application/javascript';
		case 'json':
			return 'application/json';
		case 'png':
			return 'image/png';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'gif':
			return 'image/gif';
		case 'svg':
			return 'image/svg+xml';
		default:
			return 'application/octet-stream';
	}
}
