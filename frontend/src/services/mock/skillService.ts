import type { SkillCatalog, SkillDetail } from '../../types/skill'
import type { SkillService, SkillDetailService } from '../contracts/skillService'

export const skillCatalogFixture: SkillCatalog = { demo: true, skills: [
  { id: 'invoice-field-extractor', name: 'Invoice field extractor', description: 'Extract key fields such as invoice number, date, vendor and total from invoices.', seller: 'Demo Studio', category: 'Documents', artwork: '/images/skill-invoice.png', version: 'v1.0', illustrativePrice: { amountMinor: 1200, currency: 'USD' }, preparedExample: true },
  { id: 'order-categorizer', name: 'Order categorizer', description: 'Classify orders into categories such as electronics, apparel, home and more.', seller: 'Demo Studio', category: 'Operations', artwork: '/images/skill-orders.png', version: null, illustrativePrice: null, preparedExample: false },
  { id: 'returns-classifier', name: 'Returns classifier', description: 'Identify the reason for product returns from customer messages.', seller: 'Demo Studio', category: 'Operations', artwork: '/images/skill-returns.png', version: null, illustrativePrice: null, preparedExample: false },
  { id: 'product-attribute-mapper', name: 'Product attribute mapper', description: 'Extract product attributes such as brand, color, size and material from listings.', seller: 'Demo Studio', category: 'Commerce', artwork: '/images/skill-attributes.png', version: null, illustrativePrice: null, preparedExample: false },
] }

export const invoiceSkillFixture: SkillDetail = {
  ...skillCatalogFixture.skills[0],
  demo: true,
  version: 'v1.0',
  illustrativePrice: { amountMinor: 1200, currency: 'USD' },
  tagline: 'Turn invoice text into consistent, structured fields.',
  example: {
    input: 'Acme Supplies Ltd.\n123 Market Street\nSan Francisco, CA 94105\n\nInvoice No: INV-1042\nDate: Mar 14, 2024\nTotal: USD 1,250.00\n\nThank you for your business.',
    invoiceNumber: 'INV-1042', date: 'Mar 14, 2024', vendor: 'Acme Supplies Ltd.', total: '1,250.00', currency: 'USD',
  },
}

export const mockSkillService: SkillService & SkillDetailService = {
  async getCatalog(signal) { signal?.throwIfAborted(); return structuredClone(skillCatalogFixture) },
  async getSkill(id, signal) { signal?.throwIfAborted(); return id === invoiceSkillFixture.id ? structuredClone(invoiceSkillFixture) : null },
}
