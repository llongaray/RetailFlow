import { DomainError } from './domain-error';
import { assertContractActive, rejectContractDeletion, rejectInstallmentChange } from './contract.rules';

describe('contrato', () => {
  it('RN009 impede exclusão e só cancela contrato ativo', () => {
    expect(() => rejectContractDeletion()).toThrow(expect.objectContaining({ code: 'RN009' }));
    expect(() => assertContractActive('CANCELLED')).toThrow(DomainError);
  });

  it('RN012 impede edição direta das parcelas', () => {
    expect(() => rejectInstallmentChange()).toThrow(expect.objectContaining({ code: 'RN012' }));
  });
});
