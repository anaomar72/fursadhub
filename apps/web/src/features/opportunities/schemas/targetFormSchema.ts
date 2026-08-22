import { z } from 'zod'

export const targetFormSchema = z.object({
  universityId: z.string().min(1, 'opportunities:targets.errors.universityRequired'),
  departmentIds: z.array(z.string()),
  requestedNominees: z.number().int().min(1, 'opportunities:targets.errors.nomineesMin'),
  nominationDeadline: z.string().min(1, 'opportunities:targets.errors.deadlineRequired'),
})

export type TargetFormValues = z.infer<typeof targetFormSchema>
