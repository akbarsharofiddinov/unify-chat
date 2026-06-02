import React, { useRef } from 'react'
import styless from "./AttachmentButton.module.scss"
import { Paperclip } from 'lucide-react'

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

interface AttachmentButtonProps {
	onFileSelected: (file: File | null, error?: string) => void;
}

const AttachmentButton: React.FC<AttachmentButtonProps> = ({ onFileSelected }) => {
	const attachFileRef = useRef<HTMLInputElement>(null);

	const handleAttachClick = () => {
		if (attachFileRef?.current) {
			attachFileRef.current.click();
		}
	}

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;
		if (!file) {
			onFileSelected(null);
			return;
		}

		if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
			onFileSelected(null, `Fayl hajmi ${MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024}MB dan oshmasligi kerak.`);
			event.target.value = "";
			return;
		}

		onFileSelected(file);
		event.target.value = "";
	};

	return (
		<>
			<button className={styless.attach_btn} type="button" onClick={handleAttachClick}>
				<Paperclip size={20} />
			</button>
			<input type="file" ref={attachFileRef} onChange={handleFileChange} style={{ display: "none" }} />
		</>
	)
}

export default AttachmentButton