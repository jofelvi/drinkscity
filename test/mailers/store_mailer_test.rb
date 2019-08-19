require 'test_helper'

class StoreMailerTest < ActionMailer::TestCase
  test "registration" do
    mail = StoreMailer.registration
    assert_equal "Registration", mail.subject
    assert_equal ["to@example.org"], mail.to
    assert_equal ["from@example.com"], mail.from
    assert_match "Hi", mail.body.encoded
  end

end
