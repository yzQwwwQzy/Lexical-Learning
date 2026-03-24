export const groups = [
  { id: 1, name: 'Adaptive Repeating + L1', repeating: true, annotationLang: 'l1' },
  { id: 2, name: 'Adaptive Repeating + L2', repeating: true, annotationLang: 'l2' },
  { id: 3, name: 'No Repeating + L1', repeating: false, annotationLang: 'l1' },
  { id: 4, name: 'No Repeating + L2', repeating: false, annotationLang: 'l2' },
];

// Round-robin assignment: 1->2->3->4->1->...
export function assignGroup(studentIndex) {
  return groups[(studentIndex) % 4];
}
