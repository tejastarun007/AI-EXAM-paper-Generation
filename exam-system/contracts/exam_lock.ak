// contracts/exam_lock.ak
// Aiken v1 — compile with: aiken build

use aiken/transaction.{ScriptContext, Transaction}
use aiken/transaction/credential.{VerificationKeyHash}
use aiken/interval.{Finite}

pub type ExamDatum {
  commitment:     ByteArray,   // SHA-256(key + paper_id + exam_datetime)
  unlock_slot:    Int,         // earliest slot to unlock
  hod_pkh:        VerificationKeyHash,
  lecturer_pkh:   VerificationKeyHash,
  paper_id:       ByteArray,
}

pub type ExamRedeemer {
  Unlock
  BreakGlass { hmac_token: ByteArray }
}

validator {
  fn exam_lock(datum: ExamDatum, redeemer: ExamRedeemer,
               ctx: ScriptContext) -> Bool {
    let tx = ctx.transaction

    when redeemer is {
      Unlock -> {
        // Condition 1: time-lock has passed
        let slot_ok = when tx.validity_range.lower_bound.bound_type is {
          Finite(s) -> s >= datum.unlock_slot
          _ -> False
        }

        // Condition 2: HOD has signed
        let hod_signed = list.has(
          tx.extra_signatories, datum.hod_pkh
        )

        // Condition 3: Lecturer has signed
        let lec_signed = list.has(
          tx.extra_signatories, datum.lecturer_pkh
        )

        slot_ok && hod_signed && lec_signed
      }

      // Break-glass: only chain-level admin can invoke (not enforced on-chain)
      // Real enforcement is in the off-chain break-glass endpoint
      BreakGlass { .. } -> False  // always reject on-chain; use off-chain path
    }
  }
}
