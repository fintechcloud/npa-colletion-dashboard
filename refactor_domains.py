import os
import re

src_dir = 'react_office2/src'

def replace_in_file(path, replacements):
    with open(path, 'r') as f:
        content = f.read()
    orig = content
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)
    if orig != content:
        with open(path, 'w') as f:
            f.write(content)
        print(f"Updated {path}")

# FilterBar.jsx
replace_in_file(f'{src_dir}/components/FilterBar.jsx', [
    (r'const \{([^}]*)selectedDomain([^}]*)\} = useDomain\(\);', r'const {\1selectedDomains\2} = useDomain();'),
    (r'getAvailableLeaders\(selectedDomain\)', r'getAvailableLeaders()'), # DomainContext will handle it
    (r'getAvailableAgents\(selectedDomain, filters.leader\)', r'getAvailableAgents(filters.leader)'),
    (r'\[getAvailableLeaders, selectedDomain\]', r'[getAvailableLeaders, selectedDomains]'),
    (r'\[getAvailableAgents, selectedDomain, filters.leader\]', r'[getAvailableAgents, selectedDomains, filters.leader]'),
    (r'\{selectedDomain\}', r'{selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"}')
])

# TeamLeadersPage.jsx, EmployeesPage.jsx, StatePortfolioPage.jsx, OverviewPage.jsx
for page in ['TeamLeadersPage.jsx', 'EmployeesPage.jsx', 'StatePortfolioPage.jsx', 'OverviewPage.jsx']:
    replace_in_file(f'{src_dir}/components/{page}', [
        (r'const \{([^}]*)selectedDomain([^}]*)\} = useDomain\(\);', r'const {\1selectedDomains\2} = useDomain();'),
        (r'domain: selectedDomain === \'All Domains\' \? \'\' : selectedDomain,', r'domains: Array.from(selectedDomains),'),
        (r'domain: selectedDomain,', r'domains: Array.from(selectedDomains),'),
        (r'\[filters, selectedDomain\]', r'[filters, selectedDomains]'),
        (r'\[selectedDomain\]', r'[selectedDomains]'),
        (r'\{selectedDomain\}', r'{selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"}'),
        (r'selectedDomain === \'All Domains\'', r'selectedDomains.size === 0'),
        (r'selectedDomain && selectedDomain !== \'All Domains\'', r'selectedDomains.size > 0'),
        (r'getAvailableLeaders\(selectedDomain\)', r'getAvailableLeaders()'),
        (r'selectedDomain=', r'selectedDomains='),
    ])

# DomainSwitcher.jsx
replace_in_file(f'{src_dir}/components/DomainSwitcher.jsx', [
    (r'const \{([^}]*)selectedDomain([^}]*)\} = useDomain\(\);', r'const {\1selectedDomains\2} = useDomain();'),
    (r'const isSelected = selectedDomain === d\.name;', r'const isSelected = selectedDomains.has(d.name);'),
    (r'\{selectedDomain\}', r'{selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All"}')
])

# DomainShowcaseCarousel.jsx
replace_in_file(f'{src_dir}/components/DomainShowcaseCarousel.jsx', [
    (r'const \{([^}]*)selectedDomain([^}]*)\} = useDomain\(\);', r'const {\1selectedDomains\2} = useDomain();'),
    (r'const isSelected = selectedDomain === item\.name;', r'const isSelected = selectedDomains.has(item.name);'),
])

# DomainPortfolioTable.jsx
replace_in_file(f'{src_dir}/components/DomainPortfolioTable.jsx', [
    (r'const \{([^}]*)selectedDomain, setSelectedDomain([^}]*)\} = useDomain\(\);', r'const {\1selectedDomains, toggleDomain\2} = useDomain();'),
    (r'selectedDomain === \'All Domains\'', r'selectedDomains.size === 0'),
    (r'\{selectedDomain\}', r'{selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"}'),
    (r'const isSelected = selectedDomain === d\.name;', r'const isSelected = selectedDomains.has(d.name);'),
    (r'setSelectedDomain\(d\.name\)', r'toggleDomain(d.name)'),
])

# CollectionTrendChart.jsx
replace_in_file(f'{src_dir}/components/CollectionTrendChart.jsx', [
    (r'selectedDomain', r'selectedDomains'),
    (r'\{selectedDomains\}', r'{selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"}'),
])

