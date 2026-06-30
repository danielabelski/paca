import { Check, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { FieldValue } from "../primitives";
import type { SelectOption } from "./types";

export function MultiSelectEditor({
	value = [],
	options,
	canEdit,
	onChange,
}: {
	value?: string[];
	options: SelectOption[];
	canEdit: boolean;
	onChange?: (values: string[]) => void;
}) {
	const { t } = useTranslation("projects");
	const selected = options.filter((o) => value.includes(o.value));

	function toggle(optValue: string) {
		onChange?.(
			value.includes(optValue)
				? value.filter((v) => v !== optValue)
				: [...value, optValue],
		);
	}

	if (!canEdit) {
		if (selected.length === 0) return <FieldValue empty />;
		return (
			<div className="flex flex-wrap items-center gap-1.5">
				{selected.map((opt) => (
					<span
						key={opt.value}
						className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/30 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
					>
						{opt.colorDot && (
							<span
								className="size-1.75 rounded-full shrink-0"
								style={{ background: opt.colorDot }}
							/>
						)}
						{opt.label}
					</span>
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-1.5 min-h-7">
			{selected.map((opt) => (
				<span
					key={opt.value}
					className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground/80 border border-border/20 hover:border-border/40 transition-colors duration-150"
				>
					{opt.label}
					<button
						type="button"
						onClick={() => toggle(opt.value)}
						className="text-muted-foreground/60 hover:text-destructive transition-colors duration-150"
					>
						<X className="size-2.5" />
					</button>
				</span>
			))}
			<Popover>
				<PopoverTrigger
					type="button"
					className="inline-flex items-center gap-1 rounded-md border border-dashed border-border/30 px-2 py-0.5 text-xs text-muted-foreground/60 hover:border-border/60 hover:text-muted-foreground transition-all duration-150"
				>
					<Plus className="size-2.5" />
					{t("taskDetail.propertyField.multiSelectEditor.addOption")}
				</PopoverTrigger>
				<PopoverContent
					className="w-52 p-1 rounded-xl border border-border/40 shadow-lg"
					align="start"
				>
					{options.map((opt) => {
						const isSelected = value.includes(opt.value);
						return (
							<button
								key={opt.value}
								type="button"
								className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted/60 transition-colors duration-100"
								onClick={() => toggle(opt.value)}
							>
								{opt.colorDot && (
									<span
										className="size-2 rounded-full shrink-0"
										style={{ background: opt.colorDot }}
									/>
								)}
								<span className="flex-1 text-left">{opt.label}</span>
								{isSelected && <Check className="size-3.5 text-primary" />}
							</button>
						);
					})}
				</PopoverContent>
			</Popover>
		</div>
	);
}
