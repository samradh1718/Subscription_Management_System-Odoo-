import { PASSWORD_RULES } from '../lib/password'
import { CheckIcon } from './ui'

export default function PasswordRules({ value }) {
  return (
    <ul className="grid grid-cols-1 gap-2 rounded-xl bg-page px-4 py-3 sm:grid-cols-2" aria-label="Password rules">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(value)
        return (
          <li key={rule.label} className={`flex items-center gap-2 text-xs ${passed ? 'text-ink' : 'text-muted'}`}>
            <CheckIcon active={passed} />
            {rule.label}
            <span className="sr-only">{passed ? '(met)' : '(not met)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
